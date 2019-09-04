# Authorization

- [Instalation](#installation)
- [Introduction](#introduction)
- [User interface](#user)
- [Setting up a user](#set-user)
- [Gates](#gates)
    - [Writing Gates](#writing-gates)
    - [Authorizing Actions](#authorizing-actions-via-gates)
    - [Intercepting Gate Checks](#intercepting-gate-checks)


<a name="installation"></a>
## Installation

Issue the next command in the command line

```js
npm install @xaamin/guardian
// or
yarn install @xaamin/guardian
```

<a name="introduction"></a>
## Introduction

Guardian is a simple way to authorize user actions against a given resource. There are two primary ways of authorizing actions: gates and policies.

Think of gates as simple ACL rules. Gates provide a simple, Closure based approach to authorization.

You can use `Gate` or `Guardian`, both are only aliases and have the same features.

For NodeJS imports you have to use the `const { User } = require('@xaamin/guardian');` and `module.exports = AuthorizedUser;` sintax.

<a name="user"></a>
## User interface (The contract)

You must need to create a base class that inherit from `@xaamin/guardian/src/Support/User` in order to make the module works. You only need to implement the remaining `getPermissions` and `getRoles` methods and return the proper values from inside out.

```js
    import { User } from '@xaamin/guardian';

    class AuthorizedUser extends User {
        getPermissions() {
            return this.permissions;
        }

        getRoles() {
            return this.roles;
        }
    }

    export default AuthorizedUser;
```

<a name="set-user"></a>
## Setting a user for authorization

You need to create a class that inherit from `@xaamin/guardian/src/Support/User` or use the default `User` class or a plain ocject like the given in the example below, something like the next lines and use the `setUser` method from the `Guardian` class.

```js
    // Import the guadian gate
    import { Guardian } from '@xaamin/guardian';
    import { User } from '@xaamin/guardian';

    // Or using your own implementation
    // import User from './AuthorizedUser';

    const LoggedInUser = new User({
        id: 2,
        name: 'Ben',
        email: 'xaamin@outlook.com',
        roles: [{
                group: 'Default',
                role: 'editor',
                name: 'Post editor'
            },{
                group: 'Default',
                role: 'audit',
                name: 'Log auditor'
        }],
        permissions: [{
            group: 'Default',
            permission: 'post.create',
            granted: true
        }, {
            group: 'Default',
            permission: 'post.delete',
            granted: false
        }]
    });

    // Or using a plain object as long it has permissions and roles
    // as properties of type array
    /*
    const LoggedInUser = {
        id: 2,
        name: 'Ben',
        email: 'xaamin@outlook.com',
        roles: [{
                group: 'Default',
                role: 'editor',
                name: 'Post editor'
            },{
                group: 'Default',
                role: 'audit',
                name: 'Log auditor'
        }],
        permissions: [{
            group: 'Default',
            permission: 'post.create',
            granted: true
        }, {
            group: 'Default',
            permission: 'post.delete',
            granted: false
        }]
    };
    */

    // Setting a user for authorization
    Guardian.setUser(LoggedInUser);
```

<a name="gates"></a>
## Gates

<a name="writing-gates"></a>
### Writing Gates

Gates are Closures that determine if a user is authorized to perform a given action. Gates always receive a user instance as their first argument with all the power of ACL validation, and may optionally receive additional arguments such as a relevant model:

```js
    import { Guardian } from '@xaamin/guardian';

    // Using the built-in ACL under user
    Guardian.define('post.update', (user, post) => {
        return user.is(['editor']) && post.created_by === user.id;
    });

    // Using some kind of logic
    Guardian.define('post.edit', (user, post) => {
        return user.is(['editor']) && post.created_by === user.id;
    })
```

<a name="authorizing-actions-via-gates"></a>
### Authorizing Actions

To authorize an action using gates, you should use the `allows` or `denies` methods. Note that you are not required to pass the currently authenticated user to these methods. The module will automatically take care of passing the user into the gate Closure:

```js
    import { Gate } from '@xaamin/guardian';

    if (Gate::allows('post.update', post)) {
        // The current user can update the post...
    }

    if (Gate::denies('post.update', post)) {
        // The current user can't update the post...
    }
```

If you would like to determine if a particular user is authorized to perform an action, you may use the `forUser` method on the `Gate` facade:

```js
    import { Gate } from '@xaamin/guardian';

    if (Gate::forUser(user)->allows('post.update', post)) {
        // The user can update the post...
    }

    if (Gate::forUser(user)->denies('post.update', post)) {
        // The user can't update the post...
    }
```

<a name="intercepting-gate-checks"></a>
#### Intercepting Gate Checks

Sometimes, you may wish to grant all abilities to a specific user. You may use the `before` method to define a callback that is run before all other authorization checks:

```js
    import { Gate } from '@xaamin/guardian';

    Gate::before(function (user, ability) {
        if (user->is('admin')) {
            return true;
        }
    });
```

If the `before` callback returns a non-null result that result will be considered the result of the check.

You may use the `after` method to define a callback to be executed after every authorization check. However, you may not modify the result of the authorization check from an `after` callback:

```js
    import { Gate } from '@xaamin/guardian';

    Gate::after(function (user, ability, result, arguments) {
        //
    });
```