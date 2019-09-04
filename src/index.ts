import GuardianService from './Guardian';
import User from './Support/User';

const Guardian = new GuardianService();
const Gate = Guardian;

export {
    Guardian,
    Gate,
    User
}