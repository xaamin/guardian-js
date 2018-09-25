# Authorization

- [Introduction](#introduction)
- [User interface](#user)
- [Setting up a user](#set-user)
- [Gates](#gates)
    - [Writing Gates](#writing-gates)
    - [Authorizing Actions](#authorizing-actions-via-gates)
    - [Intercepting Gate Checks](#intercepting-gate-checks)

<a name="introduction"></a>
## Introduction

Guardian is a simple way to authorize user actions against a given resource. There are two primary ways of authorizing actions: gates and policies.

Think of gates as simple ACL rules. Gates provide a simple, Closure based approach to authorization.

<a name="user"></a>
## User interface (The contract)

You must need to create a base class that inherit from `@xaamin/guardian/src/Support/User` in order to make the module works. You only need to implement the remaining `getPermissions` and `getRoles` methods and return the proper values from inside out.

```
    const UserContract = require('@xaamin/guardian/src/Support/User');

    class User extends UserContract {
        getPermissions() {
            return this.permissions;
        }

        getRoles() {
            return this.roles;
        }
    }

    module.exports = User;
```

<a name="set-user"></a>
## Setting a user for authorization

You need to create a class that inherit from `@xaamin/guardian/src/Support/User`, something like the next lines and use the `setUser` method from the `Guardian` class.

```
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

    // Setting a user for authorization
    Guardian.setUser(LoggedInUser);
```

<a name="gates"></a>
## Gates

<a name="writing-gates"></a>
### Writing Gates

Gates are Closures that determine if a user is authorized to perform a given action. Gates always receive a user instance as their first argument with all the power of ACL validation, and may optionally receive additional arguments such as a relevant model:

```
    // Create a class compliant with the User class, this is a must
    const User = require('Itnovado/Support/User');
    const Guardian = new require('@xaamin/guardian/src/Guardian');

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

```
    if (Gate::allows('post.update', post)) {
        // The current user can update the post...
    }

    if (Gate::denies('post.update', post)) {
        // The current user can't update the post...
    }
```

If you would like to determine if a particular user is authorized to perform an action, you may use the `forUser` method on the `Gate` facade:

```
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

```
    Gate::before(function (user, ability) {
        if (user->is('admin')) {
            return true;
        }
    });
```

If the `before` callback returns a non-null result that result will be considered the result of the check.

You may use the `after` method to define a callback to be executed after every authorization check. However, you may not modify the result of the authorization check from an `after` callback:

```
    Gate::after(function (user, ability, result, arguments) {
        //
    });
```