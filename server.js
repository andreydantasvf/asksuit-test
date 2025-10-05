require('dotenv').config();
const express = require('express');
const router = require('./routes/router.js');
const errorHandler = require('./middlewares/errorHandler');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

const app = express();
app.use(express.json());

const allowedOriginsEnv = process.env.ALLOWED_ORIGIN || '*';

const corsOptions = {
    origin: allowedOriginsEnv
};

app.use(cors(corsOptions));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

const port = process.env.PORT;

app.use('/', router);
app.use(errorHandler);
app.listen(port || 8080, () => {
    console.log(`Listening on port ${port}`);
});
