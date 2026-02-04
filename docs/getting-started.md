# Getting Started

This guide will help you set up and run InventoryHub on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| .NET SDK | 9.0 or higher | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| MySQL | 8.x | [mysql.com](https://dev.mysql.com/downloads/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/InventoryHub.git
cd InventoryHub
```

### 2. Database Setup

#### Create Database and User

Connect to MySQL as root and execute:

```sql
-- Create database
CREATE DATABASE inventory_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY 'inventory_pass';

-- Grant privileges
GRANT ALL PRIVILEGES ON inventory_hub.* TO 'inventory_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Apply Migrations

The database schema will be automatically created when you run the backend for the first time via Entity Framework Core migrations.

### 3. Backend Setup

Navigate to the API project directory:

```bash
cd InventoryHub.API
```

#### Configure Connection String

Update `appsettings.json` with your database credentials:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=inventory_hub;User=inventory_user;Password=inventory_pass;"
  }
}
```

#### Run the Backend

```bash
dotnet restore
dotnet run
```

The API will start on `http://localhost:5022`.

### 4. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd inventory-hub-frontend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment

Create a `.env.local` file (or update existing):

```env
NEXT_PUBLIC_API_URL=http://localhost:5022/api
```

#### Run the Frontend

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Verification

After setup, verify the installation:

1. **Backend Health Check**: Visit `http://localhost:5022/api/dashboard/stats`
   - You should see a JSON response with statistics

2. **Frontend Access**: Visit `http://localhost:3000`
   - You should see the dashboard page

3. **Database Connection**: Check that tables were created
   ```sql
   USE inventory_hub;
   SHOW TABLES;
   ```
   Expected tables: `categories`, `suppliers`, `products`, `purchases`, `inventory`, `orders`, `order_details`

## Project Scripts

### Backend Commands

| Command | Description |
|---------|-------------|
| `dotnet run` | Start the API server |
| `dotnet build` | Build the project |
| `dotnet test` | Run tests |
| `dotnet ef migrations add <name>` | Create a new migration |
| `dotnet ef database update` | Apply pending migrations |

### Frontend Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Configuration Options

### Backend Configuration (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=inventory_hub;User=inventory_user;Password=inventory_pass;"
  },
  "ExchangeRateApi": {
    "BaseUrl": "https://api.exchangerate-api.com/v4/latest/",
    "BaseCurrency": "CNY",
    "TargetCurrency": "JPY"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5022/api` |

## Troubleshooting

### Common Issues

#### Port Already in Use

If port 5022 or 3000 is already in use:

**Backend**: Update `launchSettings.json` in `Properties/`:
```json
"applicationUrl": "http://localhost:5023"
```

**Frontend**: Update `package.json`:
```json
"scripts": {
  "dev": "next dev -p 3001"
}
```

#### Database Connection Failed

1. Verify MySQL is running: `mysql -u inventory_user -p`
2. Check connection string in `appsettings.json`
3. Ensure the database exists: `SHOW DATABASES;`

#### CORS Errors

If you see CORS errors in the browser console, verify that the backend's `Program.cs` includes proper CORS configuration for your frontend URL.

#### Missing Dependencies

**Backend**:
```bash
dotnet restore
```

**Frontend**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Once your development environment is running:

1. [Explore the Features](features.md) - Learn what InventoryHub can do
2. [Review the API](api-reference.md) - Understand the available endpoints
3. [Study the Architecture](architecture.md) - Understand how components interact
4. [Read Development Guidelines](development.md) - Best practices for contributing
