<?php

namespace App\Enums;

enum JointSubType: string
{
    case ITF = 'ITF';
    case NonITF = 'Non-ITF';
    case FAO = 'FAO'; // For the Account Of

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
