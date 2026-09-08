# Collab Trip Planner

A collaborative trip planning application where users can create trips, build shared itineraries, invite other participants, and see updates in real time as the group plans together.

This project was built as a portfolio project to practice backend architecture, authentication, real-time communication, and full-stack integration.

## Features

- User registration and login with JWT-based authentication
- Create, edit, and delete trips (destination, dates, participants)
- Day-by-day itinerary with activities (time, location, estimated cost)
- Invite other users to collaborate on a trip
- Real-time itinerary updates via WebSocket — all participants see changes instantly
- Shared expense tracking with per-participant balance calculation

## Tech Stack

**Backend**
- Java 17
- Spring Boot 3
- Spring Data JPA
- Spring Security (JWT authentication)
- WebSocket (STOMP) for real-time sync
- PostgreSQL
- JUnit + Mockito for testing

**Frontend**
- React
- TypeScript
- Axios for API communication

**Infrastructure**
- Docker & Docker Compose

## Architecture

The project follows a standard layered architecture on the backend (controller → service → repository) with clear separation between the REST API and the WebSocket layer used for real-time itinerary updates. The data model centers around `User`, `Trip`, `Itinerary`, `Activity`, and `Expense` entities, with a many-to-many relationship between users and trips to support collaboration.

```
collab-trip-planner/
├── backend/
│   ├── src/main/java/...
│   └── src/test/java/...
├── frontend/
│   ├── src/
│   └── ...
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- Docker and Docker Compose

### Running locally

```bash
# Clone the repository
git clone https://github.com/piresgui/collab-trip-planner.git
cd collab-trip-planner

# Start the database
docker-compose up -d

# Run the backend
cd backend
./mvnw spring-boot:run

# Run the frontend
cd ../frontend
npm install
npm start
```

The API will be available at `http://localhost:8080` and the frontend at `http://localhost:3000`.

## Testing

Backend unit and integration tests can be run with:

```bash
cd backend
./mvnw test
```

## Development Notes

The application logic, architecture decisions, and code were developed by me as a learning project. Claude Code was used only as a support tool for git commit messages and repository organization — not for generating the application's business logic or architecture.

## Author

Guilherme Pires
[GitHub](https://github.com/piresgui) · [LinkedIn](https://www.linkedin.com/in/guilherme-pires-608909233/)
