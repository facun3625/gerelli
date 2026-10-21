-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_couponId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_couponId_fkey";

-- DropForeignKey
ALTER TABLE "PointsLedger" DROP CONSTRAINT "PointsLedger_couponId_fkey";

-- DropForeignKey
ALTER TABLE "PointsLedger" DROP CONSTRAINT "PointsLedger_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PointsLedger" DROP CONSTRAINT "PointsLedger_userId_fkey";

-- DropForeignKey
ALTER TABLE "PointsRule" DROP CONSTRAINT "PointsRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_userId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "couponId",
DROP COLUMN "discountFromCoupon",
DROP COLUMN "pointsEarned";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "allowLoyalty",
DROP COLUMN "allowPushNotifications";

-- DropTable
DROP TABLE "Coupon";

-- DropTable
DROP TABLE "CouponRedemption";

-- DropTable
DROP TABLE "PointsLedger";

-- DropTable
DROP TABLE "PointsRule";

-- DropTable
DROP TABLE "PushSubscription";

-- DropEnum
DROP TYPE "CouponDiscountType";

