# InventoryHub Documentation

Welcome to the InventoryHub documentation. InventoryHub is a comprehensive inventory management system designed to track products, purchases, orders, and inventory with multi-currency support.

## Table of Contents

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Installation, setup, and quick start guide |
| [Architecture](architecture.md) | System architecture, design patterns, and data flow |
| [Database Schema](database-schema.md) | Database tables, relationships, and constraints |
| [API Reference](api-reference.md) | Complete REST API documentation |
| [Frontend Guide](frontend-guide.md) | Frontend structure, components, and state management |
| [Backend Guide](backend-guide.md) | Backend services, controllers, and business logic |
| [Features](features.md) | Detailed feature descriptions and usage |
| [Development](development.md) | Development guidelines and best practices |

## Project Overview

InventoryHub is a full-stack inventory management application that helps businesses:

- **Track Inventory**: Monitor stock levels across multiple products and purchase sources
- **Manage Purchases**: Record purchases with multi-currency support (JPY, CNY, USD)
- **Process Orders**: Create and manage sales orders with automatic cost tracking
- **Analyze Profits**: Calculate profit margins with accurate cost-of-goods tracking
- **Import Data**: Batch import orders from external platforms (e.g., Mercari)

## Tech Stack

### Frontend
- **Framework**: Next.js 16.1.1 with React 19.2.3
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v7.3.6
- **Styling**: Tailwind CSS 4.x
- **State Management**: Zustand 5.0.9
- **Form Handling**: React Hook Form 7.69.0 + Zod 4.3.4
- **HTTP Client**: Axios 1.13.2
- **Charts**: Recharts 3.6.0
- **Export**: XLSX 0.18.5

### Backend
- **Framework**: ASP.NET Core 9.0
- **Language**: C#
- **ORM**: Entity Framework Core 9.0.0
- **Database Provider**: Pomelo.EntityFrameworkCore.MySql 9.0.0
- **Object Mapping**: AutoMapper 12.0.1

### Database
- **RDBMS**: MySQL 8.x
- **Character Set**: UTF8MB4

## Quick Links

- [Installation Guide](getting-started.md#installation)
- [API Endpoints](api-reference.md#endpoints)
- [Database ERD](database-schema.md#entity-relationship-diagram)
- [Contributing](development.md#contributing)

## Project Structure

```
InventoryHub/
├── InventoryHub.API/           # Backend (.NET Core API)
│   ├── Controllers/            # API endpoints
│   ├── Models/                 # Entity models
│   ├── DTOs/                   # Data transfer objects
│   ├── Services/               # Business logic
│   ├── Data/                   # Database context
│   └── Mappings/               # AutoMapper profiles
│
├── inventory-hub-frontend/     # Frontend (Next.js)
│   ├── app/                    # Next.js app router pages
│   ├── components/             # Reusable React components
│   ├── lib/                    # Utility functions
│   └── types/                  # TypeScript interfaces
│
└── docs/                       # Documentation (you are here)
```

## Key Features

| Feature | Description |
|---------|-------------|
| Multi-Currency Support | Handle purchases in JPY, CNY, USD with automatic exchange rate conversion |
| Real-time Stock Tracking | Track inventory levels with automatic updates on order placement |
| Cost Snapshots | Preserve historical cost data for accurate profit calculations |
| Batch Import | Import orders from Mercari via cURL command parsing |
| Dashboard Analytics | View inventory value, monthly profits, and low stock alerts |
| Responsive Design | Mobile-friendly interface with adaptive layouts |

## Support

For issues and feature requests, please refer to the project's issue tracker.

---

*Documentation last updated: February 2026*
