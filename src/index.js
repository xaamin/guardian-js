const GuardianService = require('./Guardian');
const User = require('./Support/User');

const Guardian = new GuardianService();
const Gate = Guardian;

module.exports = {
    Guardian,
    Gate,
    User
}