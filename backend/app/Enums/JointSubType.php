<?php

namespace App\Enums;

enum JointSubType: string
{
    case ITF = 'ITF';
    case NonITF = 'Non-ITF';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
