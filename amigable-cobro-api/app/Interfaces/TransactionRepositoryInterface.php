<?php

namespace App\Interfaces;

use App\Models\Transaction;
use Illuminate\Support\Collection;

interface TransactionRepositoryInterface
{
    public function getByBusiness(int $businessId): Collection;
    public function findById(int $transactionId, int $businessId): ?Transaction;
    public function create(array $data): Transaction;
    public function update(int $transactionId, int $businessId, array $data): bool;
}
