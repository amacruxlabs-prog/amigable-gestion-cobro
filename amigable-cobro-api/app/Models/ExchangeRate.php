<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'rate',
        'source',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
