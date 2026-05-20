<?php

namespace App\Enums;

enum RiskLevel: string
{
    case Low = 'Low Risk';
    case Medium = 'Medium Risk';
    case High = 'High Risk';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
