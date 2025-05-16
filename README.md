# DRUP - Project Management System

DRUP is a Svelte-based project management system where project managers can log in or register, create Projects (Projekti), add Users (Lietotāji), and manage Departments (Nodaļas).

## Features

- User authentication (login/register) with JWT
- Project management (create, view, edit)
- User management (create, view, edit)
- Department management (create, view, edit)

## Tech Stack

- Frontend: Svelte/SvelteKit
- Backend: Node.js with Express
- Database: MySQL
- Authentication: JWT

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- MySQL (v8 or later)

### Database Setup

1. Create a MySQL database named `drupdb`
2. Run the SQL scripts in `server/db-setup.sql`

```bash
mysql -u root -p < server/db-setup.sql
```

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=drupdb
JWT_SECRET=your_jwt_secret_key_here
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
# Run frontend only
npm run dev

# Run backend only
npm run server

# Run both frontend and backend
npm run dev:all
```

## Default Login

- Username: admin
- Password: admin123

## Project Structure

- `/src` - Frontend Svelte application
- `/server` - Backend Express application
- `/static` - Static assets

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login an existing user

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create a new department
