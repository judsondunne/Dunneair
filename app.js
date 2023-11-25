const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const sharedsession = require('express-socket.io-session');
const database = require('./firebase');
const { ref, set, update, onValue } = require('firebase/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const GOOGLE_CLIENT_ID = '953765951131-j6n1q53m7ipkkb17r31bnuntoeh8omau.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

// Session middleware configuration
const sessionMiddleware = session({
  secret: 'secret', // Replace with a real secret in production
  resave: false,
  saveUninitialized: true
});

// Apply session middleware to Express
app.use(sessionMiddleware);

// Debug middleware to log session data
app.use((req, res, next) => {
    // Check if session, passport, and user exist in the req object
    if (req.session && req.session.passport && req.session.passport.user) {
        var id = req.session.passport.user.id;
        console.log("Session data:", id);
    } else {
        console.log('Session, passport, or user information is missing');
    }
    next();
});

// Apply shared session middleware to Socket.IO
io.use(sharedsession(sessionMiddleware, {
  autoSave: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("User's name:", profile.displayName);
    done(null, profile);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// Function to retrieve data once from Firebase
function getActiveUsersOnce(ref) {
    return new Promise((resolve, reject) => {
        onValue(ref, (snapshot, error) => {
            if (error) {
                reject(error);
            } else {
                resolve(snapshot);
            }
        });
    });
}

app.get('/', async (req, res) => {
    try {
        const activeUsersRef = ref(database, 'users');
        const snapshot = await getActiveUsersOnce(activeUsersRef);

        if (snapshot.exists()) {
            const users = snapshot.val();

            // Filter active users
            const activeUsers = Object.entries(users || {}).filter(([userId, userData]) => userData.active);

            

            res.render('index', { user: req.user, activeUsers});
        } else {
            res.render('index', { user: req.user, activeUsers: [] }); // Handle no data case
        }
    } catch (error) {
        console.error('Error fetching active users:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  });

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

io.on('connection', (socket) => {
    // Check if session, passport, and user exist in the socket's handshake object
    if (socket.handshake.session && socket.handshake.session.passport && socket.handshake.session.passport.user) {
        const userId = socket.handshake.session.passport.user.id;
        const displayName = socket.handshake.session.passport.user.displayName;
        console.log("User ID:", userId);
        console.log("name", displayName);
        console.log("Connected")
        
        // Set the active attribute to true for the connecting user
        set(ref(database, 'users/' + userId), {
            active: true,
            isSpeaking: false,
            displayName: displayName
        });

        socket.on('disconnect', async () => {
            console.log("Disconnected")
            const activeUsersRef = ref(database, 'users');
            const snapshot = await getActiveUsersOnce(activeUsersRef);
        
            if (snapshot.exists()) {
                const users = snapshot.val();
                const activeUserIds = Object.keys(users || {}).filter((userId) => users[userId].active);
        
                console.log('Active User IDs:', activeUserIds);
                console.log('Current User ID:', userId);
        
                
                    console.log('Setting active attribute to false for user', userId);
                    update(ref(database, 'users/' + userId), {
                        active: false
                    });
                
            }
        });
    } else {
        console.log('User is not authenticated or session data is missing');
    }

    // Add back the stream event handler
    socket.on('stream', (audioData) => {
        console.log('Received stream data from a client'); // Debug log
        socket.broadcast.emit('stream', audioData);
    });
});



server.listen(3000, '0.0.0.0', () => {
    console.log('Server is listening on port 3000');
});
