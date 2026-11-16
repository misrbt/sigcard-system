<?php

namespace App\Enums;

/**
 * How a joint account is held.
 *
 * Regular joint (Non-ITF): AND (all holders must sign) or OR (any holder may sign).
 * ITF: Sole Trustee (one trustee) or Joint Trustee (two or more trustees).
 */
enum JointArrangement: string
{
    case And = 'AND';
    case Or = 'OR';
    case SoleTrustee = 'Sole Trustee';
    case JointTrustee = 'Joint Trustee';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return array<int, string>
     */
    public static function valuesForSubType(?string $jointSubType): array
    {
        return match ($jointSubType) {
            JointSubType::ITF->value => [self::SoleTrustee->value, self::JointTrustee->value],
            JointSubType::NonITF->value => [self::And->value, self::Or->value],
            default => [],
        };
    }
}
