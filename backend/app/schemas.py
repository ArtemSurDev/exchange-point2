from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime, date
from typing import Optional, List

from app.models import UserRole, OperationType, PaymentMethod

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    passport_series: str = Field(..., min_length=4, max_length=4)
    passport_number: str = Field(..., min_length=6, max_length=6)
    passport_issued_by: str
    passport_issue_date: date

    @validator('passport_series', 'passport_number')
    def validate_passport_digits(cls, v):
        if not v.isdigit():
            raise ValueError('Паспортные данные должны содержать только цифры')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    passport_series: Optional[str] = None
    passport_number: Optional[str] = None
    passport_issued_by: Optional[str] = None
    passport_issue_date: Optional[date] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    passport_series: Optional[str] = Field(None, min_length=4, max_length=4)
    passport_number: Optional[str] = Field(None, min_length=6, max_length=6)
    passport_issued_by: Optional[str] = None
    passport_issue_date: Optional[date] = None

    @validator('passport_series', 'passport_number')
    def validate_profile_passport_digits(cls, v):
        if v is None:
            return v
        if not v.isdigit():
            raise ValueError('Паспортные данные должны содержать только цифры')
        return v

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class CashierCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=8)

class CashierUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class CashierStatusUpdate(BaseModel):
    is_active: bool

class CashierResetPassword(BaseModel):
    new_password: str = Field(..., min_length=8)

class QuickClientCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    passport_series: Optional[str] = Field(None, min_length=4, max_length=4)
    passport_number: Optional[str] = Field(None, min_length=6, max_length=6)
    passport_issued_by: Optional[str] = None
    passport_issue_date: Optional[date] = None

    @validator('passport_series', 'passport_number')
    def validate_optional_passport_digits(cls, v):
        if v is None:
            return v
        if not v.isdigit():
            raise ValueError('Паспортные данные должны содержать только цифры')
        return v

# Currency schemas
class CurrencyBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=3)
    name: str
    symbol: str

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyResponse(CurrencyBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

class CurrencyRateHistoryItem(BaseModel):
    buy_rate: float
    sell_rate: float
    effective_from: datetime

class CurrencyWithRates(CurrencyResponse):
    current_buy_rate: Optional[float] = None
    current_sell_rate: Optional[float] = None
    rates_history: List[CurrencyRateHistoryItem] = []

# Exchange rate schemas
class ExchangeRateCreate(BaseModel):
    currency_id: int
    buy_rate: float = Field(..., gt=0)
    sell_rate: float = Field(..., gt=0)
    effective_from: Optional[datetime] = None
    
    @validator('sell_rate')
    def sell_greater_than_buy(cls, v, values):
        if 'buy_rate' in values and v <= values['buy_rate']:
            raise ValueError('Курс продажи должен быть больше курса покупки')
        return v

class ExchangeRateResponse(BaseModel):
    id: int
    currency_id: int
    currency_code: str
    buy_rate: float
    sell_rate: float
    effective_from: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Operation schemas
class OperationCreate(BaseModel):
    operation_type: OperationType
    currency_id: int
    amount: float = Field(..., gt=0)
    client_email: EmailStr
    payment_method: PaymentMethod

class OperationResponse(BaseModel):
    id: int
    operation_type: OperationType
    currency_code: str
    amount: float
    rate: float
    rub_amount: float
    client_name: str
    cashier_name: str
    payment_method: PaymentMethod
    receipt_number: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Report schemas
class ReportRequest(BaseModel):
    start_date: date
    end_date: date
    currency_id: Optional[int] = None

class CurrencyStats(BaseModel):
    currency_code: str
    total_buy_amount: float
    total_sell_amount: float
    total_buy_rub: float
    total_sell_rub: float
    operations_count: int

# Client info for cashier
class ClientInfo(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    passport_series: Optional[str] = None
    passport_number: Optional[str] = None
