"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";

const fieldSchema = z.object({
  label: z.string().trim().min(1),
  type: z.enum(["TEXT", "TEXTAREA", "EMAIL", "PHONE", "NUMBER", "DATE", "SELECT"]),
  required: z.boolean(),
  options: z.array(z.string()),
});
const serviceSchema = z.object({
  title: z.string().trim().min(1, "Ingresá un título"),
  description: z.string().trim().min(1, "Ingresá una descripción"),
  descriptionColumns: z.boolean(),
  formTitle: z.string().trim().min(1, "Ingresá el título del formulario"),
  submitLabel: z.string().trim().min(1, "Ingresá el texto del botón"),
  active: z.boolean(),
  fields: z.array(fieldSchema).min(1, "Agregá al menos un campo"),
  existingImages: z.array(z.object({ id: z.string(), order: z.number() })),
  newImages: z.array(z.object({ key: z.string(), order: z.number() })),
});

async function parseAndUpload(formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"), description: formData.get("description"),
    descriptionColumns: formData.get("descriptionColumns") === "true",
    formTitle: formData.get("formTitle"), submitLabel: formData.get("submitLabel"),
    active: formData.get("active") === "true",
    fields: JSON.parse(String(formData.get("fields") || "[]")),
    existingImages: JSON.parse(String(formData.get("existingImages") || "[]")),
    newImages: JSON.parse(String(formData.get("newImages") || "[]")),
  });
  const uploaded: { url: string; order: number }[] = [];
  for (const image of parsed.newImages) {
    const file = formData.get(`image_${image.key}`);
    if (file instanceof File && file.size) uploaded.push({ url: await saveUploadedFile(file, "services"), order: image.order });
  }
  return { parsed, uploaded };
}

export async function saveService(id: string | null, formData: FormData) {
  try {
    return await runSaveService(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el servicio");
  }
}

async function runSaveService(id: string | null, formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const { parsed, uploaded } = await parseAndUpload(formData);
  const data = {
    title: parsed.title, description: parsed.description, descriptionColumns: parsed.descriptionColumns, formTitle: parsed.formTitle,
    submitLabel: parsed.submitLabel, active: parsed.active,
  };
  const service = await prisma.$transaction(async (tx) => {
    if (!id) return tx.service.create({ data: { ...data, tenantId: tenant.id,
      fields: { create: parsed.fields.map((f, order) => ({ ...f, options: f.type === "SELECT" ? f.options.filter(Boolean) : [], order })) },
      images: { create: uploaded },
    }});
    const exists = await tx.service.findUnique({ where: { id, tenantId: tenant.id } });
    if (!exists) throw new ActionError("Servicio no encontrado");
    await tx.serviceField.deleteMany({ where: { serviceId: id } });
    await tx.serviceImage.deleteMany({ where: { serviceId: id, id: { notIn: parsed.existingImages.map((x) => x.id) } } });
    // updateMany con serviceId en el where (y no update por id suelto): los
    // ids vienen del cliente, así que sin esa condición se le podía cambiar
    // el orden a una imagen de otra tienda mandando un id ajeno.
    for (const image of parsed.existingImages) {
      await tx.serviceImage.updateMany({ where: { id: image.id, serviceId: id }, data: { order: image.order } });
    }
    return tx.service.update({ where: { id }, data: { ...data,
      fields: { create: parsed.fields.map((f, order) => ({ ...f, options: f.type === "SELECT" ? f.options.filter(Boolean) : [], order })) },
      images: { create: uploaded },
    }});
  });
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/admin/servicios");
  return { id: service.id };
}

export async function deleteService(id: string) {
  try {
    return await runDeleteService(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el servicio");
  }
}

async function runDeleteService(id: string) {
  const { tenant } = await requireTenantAdmin();
  await prisma.service.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/admin/servicios");
  return { ok: true as const };
}

export async function uploadServiceTextImage(formData: FormData) {
  try {
    return await runUploadServiceTextImage(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el servicio");
  }
}

async function runUploadServiceTextImage(formData: FormData) {
  await requireTenantAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new ActionError("Elegí una imagen");
  if (!file.type.startsWith("image/")) throw new ActionError("El archivo debe ser una imagen");
  return saveUploadedFile(file, "content");
}
