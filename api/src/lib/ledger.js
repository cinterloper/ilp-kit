"use strict"

const superagent = require('superagent-promise')(require('superagent'), Promise)
const Container = require('constitute').Container
const EventEmitter = require('events').EventEmitter

const PaymentFactory = require('../models/payment')
const UserFactory = require('../models/user')

const Config = require('./config')
const Log = require('./log')

const NotFoundError = require('../errors/not-found-error')

// TODO exception handling
module.exports = class Ledger extends EventEmitter {
  static constitute() { return [Config, Log, Container] }
  constructor(config, log, container) {
    super()

    const self = this

    this.config = config.data
    this.log = log('ledger')
    this.ledgerUri = this.config.getIn(['ledger', 'uri'])
    this.ledgerUriPublic = this.config.getIn(['ledger', 'public_uri'])

    container.schedulePostConstructor((User, Payment) => {
      self.User = User
      self.Payment = Payment
    }, [ UserFactory, PaymentFactory ])
  }

  // TODO caching
  * getInfo(uri) {
    const ledgerUri = uri || this.ledgerUri
    let response

    try {
      this.log.info('getting ledger info ' + ledgerUri)
      response = yield superagent.get(ledgerUri).end()
    } catch (err) {
      throw err
    }

    return response.body
  }

  * getAccount(user, admin) {
    let response

    try {
      response = yield superagent
        .get(this.ledgerUri + '/accounts/' + user.username)
        .auth(admin ? this.config.getIn(['ledger', 'admin', 'user']) : user.username, admin ? this.config.getIn(['ledger', 'admin', 'pass']) : user.password)
        .end()
    } catch (e) {
      if (e.response && e.response.body &&
         (e.response.body.id === 'NotFoundError' ||
          e.response.body.id === 'UnauthorizedError')) {
        throw new NotFoundError(e.response.body.message)
      } else {
        throw e
      }
    }

    return response.body
  }

  * putAccount(auth, data) {
    let response

    response = yield superagent
      .put(this.ledgerUri + '/accounts/' + data.name)
      .send(data)
      .auth(auth.username, auth.password)

    return response.body
  }

  updateAccount(user, admin) {
    const data = {
      name: user.username
    }

    if (user.balance) {
      data.balance = user.balance
    }

    if (user.newPassword) {
      data.password = user.newPassword
    }

    if (admin) {
      user = {
        username: this.config.getIn(['ledger', 'admin', 'user']),
        password: this.config.getIn(['ledger', 'admin', 'pass'])
      }
    }

    return this.putAccount(user, data)
  }

  createAccount(user) {
    const reload = this.config.get('reload')

    const data = {
      name: user.username,
      balance: reload ? '1000' : '' + (user.balance || 0)
    }

    if (user.password) {
      data.password = user.password
    }

    return this.putAccount({
      username: this.config.getIn(['ledger', 'admin', 'user']),
      password: this.config.getIn(['ledger', 'admin', 'pass'])
    }, data)
  }
}
