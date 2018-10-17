const GuardianService = require('./Guardian');
const User = require('./Support/User');

const Guardian = new GuardianService();

module.exports = {
    Guardian,
    User
}