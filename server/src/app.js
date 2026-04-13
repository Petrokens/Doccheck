const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

//All Routes import statements
const documentRoutes = require('./routes/documentRoutes');
const authRoutes  = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const checklistRoutes = require('./routes/checklistRoutes');


//Sidebar routes import
const sidebarRoutes = require('./routes/content/sidebarRoutes');


const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',authRoutes );
app.use('/api/documents', documentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/checklists', checklistRoutes);
const checklistItemRoutes = require('./routes/checklistItemRoutes');
app.use('/api/checklist-items', checklistItemRoutes);

const disciplineRoutes = require('./routes/disciplineRoutes');
app.use('/api/disciplines', disciplineRoutes);

app.use('/api/sidebar', sidebarRoutes);

const qcRoutes = require('./routes/qcRoutes');
app.use('/api/qc', qcRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const path = require('path');
app.use('/reports', express.static(path.join(__dirname, 'reports')));

module.exports = app;
