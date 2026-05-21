<?php

namespace App\Enums;

enum CorporateSubType: string
{
    case Corporate = 'Corporate';
    case SoleProprietorship = 'Sole Proprietorship';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
