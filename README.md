# ConnectVit

ConnectVit is a modern social media application designed to connect people through real-time communication and content sharing. It features a robust chat system, interactive social feed, and community groups.

##  Features

- **Real-time Messaging**: Instant 1-on-1 chats and group conversations powered by Socket.IO.
- **Social Feed**: Share updates, photos, and thoughts with your network.
- **Stories**: Share ephemeral moments with your friends.
- **Groups**: Create and join communities based on shared interests.
- **User Profiles**: Customizable profiles to showcase your identity.
- **Notifications**: Stay updated with real-time alerts for interactions.
- **Secure Authentication**: Robust login and signup system.

##  Tech Stack

### Frontend
- **React.js** (v18): Component-based UI library.
- **React Router** (v7): Client-side routing.
- **Socket.io-client**: Real-time bidirectional event-based communication.
- **Axios**: Promise based HTTP client.

### Backend
- **Python (Flask)**: Lightweight WSGI web application framework.
- **Flask-SocketIO**: Low latency bi-directional communications.
- **Database**: 
  - **SQLite**: Default for development.
  - **PostgreSQL**: Supported for production environments.
- **Authentication**: Bcrypt for secure password hashing.

##  Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites
- **Node.js** (v14 or higher)
- **Python** (v3.8 or higher)
- **pip** (Python package installer)

###  Backend Setup

1. Navigate to the backend directory:
   `ash
   cd backend
   `

2. Create a virtual environment (optional but recommended):
   `ash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   `

3. Install dependencies:
   `ash
   pip install -r requirements.txt
   `

4. Run the application:
   `ash
   python app.py
   `
   The backend server will start (default: http://localhost:5000).

###  Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   `ash
   cd frontend
   `

2. Install dependencies:
   `ash
   npm install
   `

3. Start the development server:
   `ash
   npm start
   `
   The application will open in your browser at http://localhost:3000.

##  Configuration

### Backend
Create a .env file in the ackend directory to configure your environment variables (optional for local dev with SQLite):

`env
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=your_secret_key
`

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  License

This project is open source and available under the [MIT License](LICENSE).
