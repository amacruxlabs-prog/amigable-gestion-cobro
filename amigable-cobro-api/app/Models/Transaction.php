<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'business_id',
        'client_name',
        'client_document',
        'client_phone',
        'total_amount',
        'paid_amount',
        'status',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'transaction_id');
    }
}
