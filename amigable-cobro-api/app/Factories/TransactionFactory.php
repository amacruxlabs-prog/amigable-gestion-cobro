<?php

namespace App\Factories;

use App\Models\Transaction;

class TransactionFactory
{
    /**
     * Build a complex transaction payload dynamically.
     */
    public static function createPayload(array $rawData, int $businessId): array
    {
        // El Factory abstrae la complejidad de preparar los datos antes del Service/Repository
        return [
            'business_id'     => $businessId,
            'client_name'     => strtoupper(trim($rawData['name'] ?? 'Cliente Desconocido')),
            'client_document' => $rawData['document'] ?? null,
            'client_phone'    => self::formatPhone($rawData['phone'] ?? null),
            'total_amount'    => abs(floatval($rawData['total'] ?? 0)),
            'paid_amount'     => abs(floatval($rawData['paid'] ?? 0)),
        ];
    }

    private static function formatPhone(?string $phone): ?string
    {
        if (!$phone) return null;
        return preg_replace('/[^0-9+]/', '', $phone);
    }
}
