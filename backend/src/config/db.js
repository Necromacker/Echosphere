const mongoose = require('mongoose');
const util = require('util');
const dns = require('dns').promises;
const net = require('net');
const logger = require('./logger');

const getMongoTarget = () => {
  if (!process.env.MONGO_URI) return 'MONGO_URI is not set';

  try {
    const uri = new URL(process.env.MONGO_URI);
    return `${uri.protocol}//${uri.hostname}${uri.pathname}`;
  } catch {
    return 'MONGO_URI is invalid';
  }
};

const probeHost = (host, port, timeoutMs) => new Promise((resolve) => {
  const socket = net.createConnection({ host, port });
  const finish = (result) => {
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(timeoutMs, () => finish({ host, port, result: 'timeout', code: 'ETIMEDOUT' }));
  socket.once('connect', () => finish({ host, port, result: 'reachable' }));
  socket.once('error', (error) => finish({ host, port, result: 'error', code: error.code, message: error.message }));
});

const logNetworkDiagnostics = async (error) => {
  const topology = error.reason;
  const servers = topology?.servers ? [...topology.servers.keys()] : [];
  logger.error(`MongoDB network diagnostics: topology=${topology?.type || 'unknown'}, serverCount=${servers.length}`);

  await Promise.all(servers.map(async (address) => {
    const [host, portText] = address.split(':');
    const port = Number(portText) || 27017;

    try {
      const addresses = await dns.lookup(host, { all: true });
      logger.info(`MongoDB DNS: host=${host}, addresses=${addresses.map(({ address, family }) => `${address}/IPv${family}`).join(',')}`);
    } catch (dnsError) {
      logger.error(`MongoDB DNS failed: host=${host}, code=${dnsError.code || 'n/a'}, message=${dnsError.message}`);
    }

    const probe = await probeHost(host, port, 5000);
    logger.error(`MongoDB TCP probe: host=${probe.host}, port=${probe.port}, result=${probe.result}, code=${probe.code || 'n/a'}, message=${probe.message || 'n/a'}`);
  }));
};

const connectDB = async () => {
  logger.info(`MongoDB connection starting: target=${getMongoTarget()}, readyState=${mongoose.connection.readyState}`);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    });
    logger.info(`✅ MongoDB connected: host=${conn.connection.host}, db=${conn.connection.name}, readyState=${conn.connection.readyState}`);
    
    // Safely drop legacy/stale username index if it exists in the users collection
    try {
      await mongoose.connection.collection('users').dropIndex('username_1');
      logger.info('Cleaned up legacy username_1 index from users collection');
    } catch (error) {
      logger.warn(`MongoDB legacy index cleanup skipped: name=${error.name}, code=${error.code || 'n/a'}, message=${error.message}`);
    }

    return true;
  } catch (error) {
    logger.error(`❌ MongoDB connection failed: name=${error.name}, code=${error.code || 'n/a'}, message=${error.message}`);
    if (error.reason) logger.error(`MongoDB server selection details: ${util.inspect(error.reason, { depth: 5, breakLength: 160 })}`);
    if (error.stack) logger.error(error.stack);
    await logNetworkDiagnostics(error);
    logger.warn('⚠️ Server continuing without MongoDB. Some features will be disabled.');
    return false;
  }
};

mongoose.connection.on('connecting', () => logger.info('MongoDB event: connecting'));
mongoose.connection.on('connected', () => logger.info(`MongoDB event: connected, readyState=${mongoose.connection.readyState}`));
mongoose.connection.on('error', (error) => logger.error(`MongoDB event: error, name=${error.name}, code=${error.code || 'n/a'}, message=${error.message}`));
mongoose.connection.on('disconnected', () => {
  logger.warn(`MongoDB event: disconnected, readyState=${mongoose.connection.readyState}`);
});

mongoose.connection.on('reconnected', () => {
  logger.info(`MongoDB event: reconnected, readyState=${mongoose.connection.readyState}`);
});

module.exports = connectDB;
