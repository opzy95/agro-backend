const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Request body contains invalid JSON'
    });
  }

  next(error);
});

app.get('/', (req, res) => {
  res.json({
    message: 'Agro backend is running'
  });
});

const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoute');


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};





startServer();