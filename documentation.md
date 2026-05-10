# EvGenee - Complete Project Documentation 🚗⚡

Welcome to the comprehensive, beginner-friendly documentation for **EvGenee**! This guide is designed to help students, developers, and beginners understand how the application works, what APIs and models it uses, and how the overall flow is structured.

---

## Part 1: Project Explanation & AI Models

### What is EvGenee?
**EvGenee** is an Electric Vehicle (EV) charging station finder and management application. It serves as a bridge between EV owners looking for charging spots and station owners who want to list their stations. 

Imagine you are driving an EV and your battery is running low. EvGenee allows you to:
1. Find nearby charging stations on a map.
2. Check if the specific connector type your car needs is currently available.
3. Reserve a charging slot before you arrive so you don't have to wait.
4. Pay securely online for your charging session.

It also has an intelligent **AI Voice Assistant** to help you book stations simply by talking or typing to the bot!

### AI Models & Technologies Used
To make the application smart and responsive, EvGenee integrates modern AI capabilities:
- **Groq API & Langchain**: The AI voice chat assistant is powered by the **Groq API** (using the `openai/gpt-oss-20b` model) integrated via **Langchain** and **LangGraph**. 
- **Agentic AI**: The AI doesn't just answer questions; it acts as an agent. It can call tools like `find_best_station` (to search for available stations, checking real-time availability and distance) and `create_booking` (to reserve a slot for the user).

### Tech Stack

#### Frontend (`evgenee_frontend`)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Routing & State**: TanStack Router, TanStack Query, Zustand
- **Maps**: React Leaflet
- **Real-time**: Socket.io-client
- **Forms & Validation**: React Hook Form, Zod

#### Backend (`EvGenee_Backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Payments**: Razorpay
- **Security**: JSON Web Tokens (JWT), bcrypt
- **Task Scheduling**: node-cron

---

## Part 2: APIs Used in the Project

The application communicates between the frontend and backend using RESTful APIs. Here is the breakdown of all important APIs and external integrations.

### 1. External APIs (Third-Party Services)
These are services provided by other platforms that EvGenee uses to function:
- **Razorpay API**: Used for secure payment processing when users book a charging session or pay an advance fee.
- **OpenStreetMap (Nominatim) API**: Used to convert location names (like "Delhi") into exact map coordinates (latitude and longitude).
- **OSRM (Open Source Routing Machine) API**: Used to calculate the road distance and travel time between the user's location and the charging station.
- **Leaflet Maps**: Used on the frontend to display interactive maps and plot charging station markers.
- **Socket.io**: Used for real-time, bi-directional communication (e.g., updating charging station availability instantly without refreshing the page).

### 2. Internal APIs (Backend Routes)
These are the APIs built within the EvGenee Node.js/Express backend.

#### User APIs (`/api/users`)
- `POST /register`: Registers a new user or station owner securely.
- `POST /login`: Authenticates the user and returns a JWT (JSON Web Token) for secure access.
- `GET /profile`: Fetches the currently logged-in user's profile and vehicle details.
- `PUT /profile`: Updates the user's profile details.
- `POST /logout`: Logs the user out.

#### Station APIs (`/api/stations`)
- `GET /nearby`: Fetches stations near the user's current coordinates.
- `POST /add`: Allows a Station Owner to add a new charging station.
- `GET /owner/my-stations`: Fetches all stations owned by the logged-in owner.
- `GET /:stationId`: Fetches detailed information about a specific station.
- `PUT /:stationId`: Updates a station's details.
- `PATCH /:stationId/toggle`: Toggles whether a station is currently open or closed.
- `POST /:stationId/review`: Allows users to submit a review and rating for a station.
- **Admin APIs**: Endpoints like `GET /admin/all-stations`, `PUT /admin/:stationId/status`, and `DELETE /admin/:stationId` allow administrators to manage the platform.

#### Booking APIs (`/api/bookings`)
- `GET /availability`: Checks if a station has available ports for a specific date, time, and connector type.
- `POST /validate`: Validates booking details before proceeding to creation.
- `POST /create`: Creates a new booking reservation (set to 'pending' until payment is made).
- `GET /my-bookings`: Retrieves all bookings made by the logged-in user.
- `GET /station/:stationId`: Retrieves all bookings for a specific station (for owners).
- `GET /:bookingId`: Fetches details of a specific booking.
- `POST /:bookingId/cancel`: Cancels an active booking.
- `POST /:bookingId/confirm-advance`: Confirms the advance payment and marks the booking as 'confirmed'.
- `POST /:bookingId/check-in`: Initiates the charging session when the user arrives.
- `POST /:bookingId/complete`: Ends the charging session and generates the final bill.

#### Payment APIs (`/api/payments`)
- `POST /create-order`: Generates a new Razorpay order ID for the payment transaction.
- `POST /update-payment`: Verifies and saves the successful payment details in the database.

#### AI Assistant APIs (`/api/ai`)
- `POST /chat`: Receives user messages (text or transcribed voice) and returns AI-generated responses, station suggestions, or booking confirmations.

---

## Part 3: Complete Flow of the Project

Here is the step-by-step journey of how a user interacts with the EvGenee platform:

1. **Onboarding (Registration & Login)**
   - A user opens the app and registers an account (User or Station Owner).
   - They log in and receive an authentication token. They can also set up their vehicle details in their profile.

2. **Discovering Stations**
   - The user views an interactive map showing nearby charging stations based on their GPS location.
   - Alternatively, they can use the **AI Voice Assistant** to say, "Find me a Type 2 charger nearby," and the AI will fetch the best options.

3. **Checking Availability**
   - The user selects a station, picks a date, a time slot, and their car's connector type.
   - The backend runs an algorithm to check against existing bookings and total available ports to confirm if that slot is free.

4. **Booking & Advance Payment**
   - Once a free slot is confirmed, a `pending` booking is created.
   - The user is redirected to pay an advance fee using Razorpay securely.
   - Upon successful payment, the booking status changes to `confirmed`.

5. **Charging Session**
   - When the user arrives at the station, they hit **Check-in** on the app. The session starts, and the status changes to `in-progress`.
   - Other users looking at the map will now see that specific port is occupied (updated in real-time via Socket.io).
   - Once charging is done, the user hits **Complete**, the final cost is calculated, and the port becomes available again.

6. **Station Owners & Admins**
   - Station owners have a dashboard to add stations, set pricing per connector, and track incoming bookings.
   - Admins can monitor all stations, verify owners, and suspend rule-violating stations.

---

## Part 4: Error Codes Thrown by the Project

EvGenee uses standard HTTP status codes to communicate errors. Here are the common error codes you will encounter and what they mean:

| Status Code | Name | What it means in EvGenee |
| :--- | :--- | :--- |
| **200 OK** | Success | The request was successful (e.g., fetching profile, confirming booking). |
| **201 Created** | Created Successfully | A new resource was successfully created (e.g., successful user registration, station added). |
| **400 Bad Request** | Validation Error | The data sent by the user is incorrect or missing. Example: Missing email during login, or trying to book a past time slot. |
| **401 Unauthorized** | Not Authenticated | The user is not logged in or their session token has expired. They must log in again. |
| **403 Forbidden** | Access Denied | The user is logged in but does not have permission to perform this action. Example: A regular user trying to add a new charging station (only Station Owners can). |
| **404 Not Found** | Resource Missing | The requested item does not exist. Example: Trying to fetch details for a `stationId` that was deleted or doesn't exist. |
| **409 Conflict** | Conflict | The action cannot be completed due to a conflict. Example: Trying to book a time slot that was just reserved by someone else a second ago. |
| **500 Internal Server** | Server Error | Something broke on the backend server (e.g., database connection failed, third-party API like Razorpay is down). |

> [!TIP]
> **For Developers:** Always check the network tab in your browser's Developer Tools to see the exact error message returned by the backend in case of a 400 or 500 status code!
