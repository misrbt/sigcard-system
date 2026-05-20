<?php

namespace App\Enums;

enum CustomerStatus: string
{
    case Active = 'active';
    case Dormant = 'dormant';
    case Escheat = 'escheat';
    case Closed = 'closed';
    case Reactivated = 'reactivated';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
