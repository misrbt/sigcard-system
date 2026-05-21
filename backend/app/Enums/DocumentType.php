<?php

namespace App\Enums;

enum DocumentType: string
{
    case SigcardFront = 'sigcard_front';
    case SigcardBack = 'sigcard_back';
    case NaisFront = 'nais_front';
    case NaisBack = 'nais_back';
    case PrivacyFront = 'privacy_front';
    case PrivacyBack = 'privacy_back';
    case Other = 'other';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
