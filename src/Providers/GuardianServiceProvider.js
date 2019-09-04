const { ServiceProvider } = use('@adonisjs/fold')
const { ioc } = use('@adonisjs/fold')
const Guardian = use('@xaamin/guardian/src/Guardian')

class GuardianServiceProvider extends ServiceProvider {
    register() {
        ioc.singleton('Xaamin/Guardian/Gate', function(app) {
            return new Guardian
        })
    }

    boot() {}
}

module.exports = GuardianServiceProvider;