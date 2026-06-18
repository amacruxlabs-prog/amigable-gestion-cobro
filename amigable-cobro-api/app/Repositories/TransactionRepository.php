<?php

namespace App\Repositories;

use App\Interfaces\TransactionRepositoryInterface;
use App\Models\Transaction;
use Illuminate\Support\Collection;

class TransactionRepository implements TransactionRepositoryInterface
{
    public function getByBusiness(int $businessId): Collection
    {
        return Transaction::where('business_id', $businessId)->get();
    }

    public function findById(int $transactionId, int $businessId): ?Transaction
    {
        return Transaction::where('id', $transactionId)
            ->where('business_id', $businessId)
            ->first();
    }

    public function create(array $data): Transaction
    {
        return Transaction::create($data);
    }

    public function update(int $transactionId, int $businessId, array $data): bool
    {
        return Transaction::where('id', $transactionId)
            ->where('business_id', $businessId)
            ->update($data) > 0;
    }
}
