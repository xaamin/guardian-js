const User = require('./Support/User');

class Guardian
{
    constructor() {
        this.policies = [];
        this.logedInUser = null;

        this.get = this.get.bind(this);

        return new Proxy(this, {
            get: this.get
        });
    }

    before(callback) {
        Guardian._before = callback;
    }

    after(callback) {
        Guardian._after = callback;
    }

    get(target, name) {
        return name in target ? target[name] : this.getUser()[name];
    }

    define(policy, callback) {
        this.policies[policy] = callback;
    }

    isDefined(policy) {
        return this.policies[policy] !== undefined;
    }

    applyBeforeCheck() {
        let allowed = false;

        if (Guardian._before) {
            allowed = Guardian._before.apply(Guardian, arguments);
        }

        return allowed;
    }

    applyAfterCheck() {
        if (Guardian._after) {
            let params = [].slice.call(arguments);

            Guardian._after.apply(Guardian, arguments);
        }
    }

    _applyPolicy() {
        let params = [].slice.call(arguments);
        const user = params.shift();
        const policy = params.shift();
        let allowed = false;

        if (allowed === false) {
            if (!this.isDefined(policy)) {
                return false;
            }

            const args = [user].concat(params);

            allowed = this.policies[policy].apply(this, args);
        }

        return allowed;
    }

    allows() {
        let params = [].slice.call(arguments);
        const user = this.getUser();

        let allowed = false;
        let args = [user].concat(params);

        // Apply global checks
        allowed = this.applyBeforeCheck.apply(this, args);

        // Apply custom policies
        if (allowed === false) {
            allowed = this._applyPolicy.apply(this, args);
        }

        const ability = params.shift();

        // Apply basic user ACL
        if (allowed === false && !this.isDefined(ability)) {
            allowed = this.getUser().can(ability);
        }

        args =
            [user]
                .concat([ability])
                .concat([allowed])
                .concat(params);

        // Apply global after checks, this does not mutate the result
        this.applyAfterCheck.apply(this, args);

        return allowed;
    }

    denies() {
        return !this.allows.apply(this, arguments);
    }

    __validate(user) {
        const instanceOfUser = user instanceof User === true;

        if (!instanceOfUser && user.roles && user.permissions) {
            user = new User(user);
        } else if (!instanceOfUser && !user.roles && !roles.permissions) {
            throw new Error('User object does not have a roles or permissions properties');
        } else if (!instanceOfUser) {
            throw new Error('Class for user is not a implementation of Guardian/User');
        }

        return user;
    }

    forUser(user) {
        user = this.__validate(user);

        const guardian = new Guardian();

        guardian.setUser(user);

        for (const policy in this.policies) {
            const callback = this.policies[policy];

            guardian.define(policy, callback);
        }

        return guardian;
    }

    setUser(user) {
        user = this.__validate(user);

        this.user = user;

        return this;
    }

    getUser() {
        let user = this.user;

        if (!user) {
            throw new Error('No user logged in');
        }

        return user;
    }

    getPolicies() {
        return this.policies;
    }
}

module.exports = Guardian;