import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UUID_PATTERN } from '../../common/utils/uuid';

export const MODULES = [
  'module_inventory',
  'module_sales',
  'module_reports',
  'module_audit',
  'module_customers',
  'module_transfers',
  'module_kits',
  'module_suppliers',
  'module_purchases',
  'module_quotes',
  'module_discounts',
  'module_petty_cash',
];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class AdminFilterDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Matches(UUID_PATTERN) orgId?: string;
  @IsOptional() @Matches(UUID_PATTERN) planId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['pending', 'paid', 'voided']) status?: string;
  @IsOptional()
  @IsIn(['vigente', 'en_marcha', 'concluido', 'sin_plan'])
  subscriptionState?: string;
  @IsOptional() @Matches(UUID_PATTERN) userId?: string;
  @IsOptional() @IsString() @MaxLength(100) action?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) limit = 1000;
}
export class AdminOrganizationDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) name: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(40) taxId: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  responsibleName: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalRepresentative: string;
  @Matches(/^\+[1-9]\d{6,14}$/) phone: string;
  @IsOptional()
  @IsString()
  @MaxLength(700000)
  @Matches(/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$/)
  logo?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/[^\s]+)?$/)
  website?: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) address: string;
  @Transform(trim) @IsEmail() email: string;
  @IsIn(['active', 'suspended']) status: string;
  @IsOptional() @Matches(UUID_PATTERN) planId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsIn(['monthly', 'yearly']) renewalPeriod: string;
  @IsIn(['active', 'past_due', 'canceled']) subscriptionStatus: string;
  @IsOptional() @IsEmail() ownerEmail?: string;
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  ownerPassword?: string;
}
export class AdminPlanDto {
  @Transform(trim) @Matches(/^[a-z0-9_-]{2,50}$/) code: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999)
  priceMonthly: number;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999)
  priceYearly: number;
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsIn(['active', 'archived']) status: string;
  @IsArray() @ArrayUnique() @IsIn(MODULES, { each: true }) modules: string[];
  @IsOptional() @IsInt() @Min(1) maxRoles: number | null;
  @IsOptional() @IsInt() @Min(0) maxProducts: number | null;
  @IsOptional() @IsInt() @Min(1) maxUsers: number | null;
  @IsOptional() @IsInt() @Min(1) maxBranches: number | null;
}
export class AdminUserDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(150) fullName: string;
  @Transform(trim) @IsEmail() email: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(128) password?: string;
  @IsIn(['super_admin', 'accountant']) platformRole: string;
  @IsIn(['active', 'disabled']) status: string;
}
export class AdminPaymentDto {
  @Matches(UUID_PATTERN) orgId: string;
  @Matches(UUID_PATTERN) planId: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999) amount: number;
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsDateString() paidOn: string;
  @IsIn(['pending', 'paid']) status: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) reference: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class PaymentStatusDto {
  @IsIn(['paid', 'voided']) status: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(1000) reason: string;
}
export class LegalDocumentDto {
  @IsIn(['terms', 'privacy']) kind: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(50) version: string;
  @Transform(trim)
  @IsString()
  @MinLength(20)
  @MaxLength(100000)
  content: string;
  @IsBoolean() publish: boolean;
}
