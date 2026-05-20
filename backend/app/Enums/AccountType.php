<?php

namespace App\Enums;

enum AccountType: string
{
    case Regular = 'Regular';
    case Joint = 'Joint';
    case Corporate = 'Corporate';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
