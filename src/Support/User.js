class User {
    constructor(attributes) {
        this.attributes = attributes;

        this.get = this.get.bind(this);

        return new Proxy(this, {
            get: this.get
        });
    }

    get(target, name) {
        return name in target ? target[name] : target.getData()[name];
    }

    getData() {
        const attributes = this.attributes;

        if (!attributes) {
            throw new Error('Properties not defined for current user');
        }

        return attributes;
    }

    getPermissions() {
        const attributes = this.getData();

        if (!attributes.permissions) {
            throw new Error('Permissions Not implemented');
        }

        return attributes.permissions;
    }

    getRoles() {
        const attributes = this.getData();

        if (!attributes.roles) {
            throw new Error('Roles Not implemented');
        }

        return attributes.roles;
    }

    is(role) {
        const roles = this.getRoles();
        const requested = typeof role === 'string' ? [role] : role;

        const founded = roles.filter((value) => {
            return requested.indexOf(value.role) !== -1;
        });

        return founded.length > 0;
    }

    can(ability) {
        const permissions = this.getPermissions();
        const requested = typeof ability === 'string' ? [ability] : ability;

        const founded = permissions.filter((value) => {
            return requested.indexOf(value.permission) !== -1 && value.granted === true;
        });

        return founded.length > 0;
    }
}

module.exports = User;