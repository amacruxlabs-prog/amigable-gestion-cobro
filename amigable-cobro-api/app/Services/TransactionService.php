<?php

namespace App\Services;

use App\Interfaces\TransactionRepositoryInterface;
use App\Models\Transaction;
use Exception;

class TransactionService
{
    private TransactionRepositoryInterface $repository;

    public function __construct(TransactionRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function processNewTransaction(array $data, int $businessId): Transaction
    {
        // Reglas de negocio puras
        if ($data['paid_amount'] > $data['total_amount']) {
            throw new Exception("El abono no puede superar el total adeudado.");
        }

        $data['business_id'] = $businessId;
        $data['status'] = $data['paid_amount'] >= $data['total_amount'] ? 'PAID' : 'PENDING';

        return $this->repository->create($data);
    }
    
    // Aquí irían más métodos complejos de lógica de negocio (saldos, cobros, etc.)
}
