from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Date, LargeBinary
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    GUEST = "guest"
    CLIENT = "client"
    CASHIER = "cashier"
    ADMIN = "admin"

class OperationType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    passport_series = Column(String(4), nullable=True)
    passport_number = Column(String(6), nullable=True)
    passport_issued_by = Column(String, nullable=True)
    passport_issue_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    client_operations = relationship("Operation", foreign_keys="Operation.client_id", back_populates="client")
    cashier_operations = relationship("Operation", foreign_keys="Operation.cashier_id", back_populates="cashier")

class Currency(Base):
    __tablename__ = "currencies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(3), unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    symbol = Column(String(5), nullable=False)
    is_active = Column(Boolean, default=True)

    rates = relationship("ExchangeRate", back_populates="currency")
    operations = relationship("Operation", back_populates="currency")

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    buy_rate = Column(Float, nullable=False)
    sell_rate = Column(Float, nullable=False)
    effective_from = Column(DateTime, nullable=False, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    currency = relationship("Currency", back_populates="rates")
    creator = relationship("User")

class Operation(Base):
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(Enum(OperationType), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    rub_amount = Column(Float, nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    receipt_number = Column(String, unique=True, nullable=False)
    receipt_pdf = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=func.now())

    currency = relationship("Currency", back_populates="operations")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_operations")
    cashier = relationship("User", foreign_keys=[cashier_id], back_populates="cashier_operations")

class CurrencyLimit(Base):
    __tablename__ = "currency_limits"

    id = Column(Integer, primary_key=True, index=True)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    daily_limit = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())

    currency = relationship("Currency")
    client = relationship("User")
