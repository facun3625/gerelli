"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVerticalIcon, ImagePlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deleteEstatePropertyImage,
  reorderEstatePropertyImages,
} from "@/app/admin/gestion/actions";

type ExistingImage = { id: string; url: string };

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function syncFileInput(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}

export function PropertyImagesManager({
  propertyId,
  images,
  onDirty,
}: {
  propertyId?: string;
  images: ExistingImage[];
  onDirty: () => void;
}) {
  const [items, setItems] = useState(images);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // dnd-kit numera sus ids de accesibilidad con un contador propio, que no da
  // igual en el servidor y en el navegador (error de hidratación). useId sí.
  const dndId = useId();

  const previews = useMemo(
    () => pendingFiles.map((f) => URL.createObjectURL(f)),
    [pendingFiles],
  );
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  // Con mouse arranca al mover unos píxeles (un click normal sigue tocando
  // la estrella o el tacho). En el celular hay que mantener apretado un
  // momento: si no, cada scroll sobre las fotos las movería.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    void applyOrder(move(items, from, to)).then((ok) => {
      if (ok && to === 0) toast.success("Portada actualizada");
    });
  }

  // La portada es la primera foto: la llevamos directo al principio.
  async function handleSetCover(index: number) {
    if (index === 0) return;
    if (await applyOrder(move(items, index, 0))) toast.success("Portada actualizada");
  }

  async function applyOrder(reordered: ExistingImage[]): Promise<boolean> {
    if (!propertyId || reordered === items) return false;
    setItems(reordered);
    const result = await reorderEstatePropertyImages(
      propertyId,
      reordered.map((i) => i.id),
    );
    if ("error" in result) {
      toast.error(result.error);
      setItems(items);
      return false;
    }
    return true;
  }

  async function handleDelete(id: string) {
    if (!propertyId) return;
    setBusyId(id);
    const previous = items;
    setItems(items.filter((i) => i.id !== id));
    const result = await deleteEstatePropertyImage(id);
    setBusyId(null);
    if ("error" in result) {
      toast.error(result.error);
      setItems(previous);
    }
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const added = Array.from(e.target.files ?? []);
    if (!added.length) return;
    const merged = [...pendingFiles, ...added].slice(0, 10);
    setPendingFiles(merged);
    syncFileInput(inputRef.current, merged);
    onDirty();
  }

  function removePending(index: number) {
    const merged = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(merged);
    syncFileInput(inputRef.current, merged);
    onDirty();
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Arrastrá las fotos para cambiar el orden (en el celular, mantené apretada la foto un
          momento). Tocá la estrella para usarla como portada.
        </p>
      )}
      {items.length > 0 && (
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {items.map((img, i) => (
                <SortablePhoto
                  key={img.id}
                  image={img}
                  isCover={i === 0}
                  busy={busyId === img.id}
                  onSetCover={() => handleSetCover(i)}
                  onDelete={() => handleDelete(img.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {previews.map((src, i) => (
            <div key={src} className="group relative overflow-hidden rounded-xl border border-dashed">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover opacity-80" />
              <button
                type="button"
                onClick={() => removePending(i)}
                aria-label="Quitar foto"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary">
        <ImagePlusIcon className="size-4" />
        Agregar fotografías
        <input
          ref={inputRef}
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleAddFiles}
          className="hidden"
        />
      </label>
    </div>
  );
}

function SortablePhoto({
  image,
  isCover,
  busy,
  onSetCover,
  onDelete,
}: {
  image: ExistingImage;
  isCover: boolean;
  busy: boolean;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square cursor-grab touch-manipulation select-none overflow-hidden rounded-xl border [-webkit-touch-callout:none] active:cursor-grabbing ${
        isDragging ? "z-10 opacity-80 shadow-xl ring-2 ring-primary" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1">
        <GripVerticalIcon className="size-4 text-white/80" aria-hidden />
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          aria-label="Eliminar foto"
          className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
      {isCover ? (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          <StarIcon className="size-3 fill-current" />
          Portada
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onSetCover}
          title="Usar como portada"
          aria-label="Usar como portada"
          className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-30"
        >
          <StarIcon className="size-3" />
          <span className="hidden group-hover:inline">Hacer portada</span>
        </button>
      )}
    </div>
  );
}
