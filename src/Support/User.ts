import { RoleInterface } from '../Interfaces/RoleInterface';
import { PermissionInterface } from '../Interfaces/PermissionInterface';

class User {
    protected attributes: any;

    constructor(attributes: any = {}) {
        this.attributes = attributes;

        this.get = this.get.bind(this);

        return new Proxy(this, {
            get: this.get
        });
    }

    get(target: User, name: string) {
        return name in target ? (target as any)[name] : target.getData()[name];
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

    is(role: string | string[]) {
        const roles = this.getRoles();
        const requested = typeof role === 'string' ? [role] : role;

        const founded = roles.filter((value: RoleInterface) => {
            return requested.indexOf(value.role) !== -1;
        });

        return founded.length > 0;
    }

    can(ability: string | string[]) {
        const permissions = this.getPermissions();
        const requested = typeof ability === 'string' ? [ability] : ability;

        const founded = permissions.filter((value: PermissionInterface) => {
            return requested.indexOf(value.permission) !== -1 && value.granted === true;
        });

        return founded.length > 0;
    }
}

export default User;