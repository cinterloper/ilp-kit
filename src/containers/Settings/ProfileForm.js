import React, {Component, PropTypes} from 'react'
import {reduxForm} from 'redux-form'
import DropzoneComponent from 'react-dropzone-component'
import Alert from 'react-bootstrap/lib/Alert'

import * as actions from 'redux/actions/auth'

import { successable } from 'decorators'
import { resetFormOnSuccess } from 'decorators'

import Input from 'components/Input/Input'

import classNames from 'classnames/bind'
import styles from './ProfileForm.scss'
const cx = classNames.bind(styles)

@reduxForm({
  form: 'profileSettings',
  fields: ['email', 'name']
  // TODO local validation
}, state => ({
  user: state.auth.user,
  fail: state.auth.fail,
  // TODO server side rendering for initialValues is messed up
  // https://github.com/erikras/redux-form/issues/896
  initialValues: {
    email: (state.auth.user && state.auth.user.email) || undefined,
    name: (state.auth.user && state.auth.user.name) || undefined
  }
}), actions)
@successable()
@resetFormOnSuccess('profileSettings')
export default class ProfileForm extends Component {
  static propTypes = {
    // Redux Form
    fields: PropTypes.object,
    pristine: PropTypes.bool,
    invalid: PropTypes.bool,
    handleSubmit: PropTypes.func,
    submitting: PropTypes.bool,
    error: PropTypes.any,
    submitFailed: PropTypes.bool,

    // Successable
    tempSuccess: PropTypes.func,
    success: PropTypes.bool,

    // Auth
    user: PropTypes.object,
    save: PropTypes.func
  }

  save = (data) => {
    return this.props.save({username: this.props.user.username}, data)
      .then(() => {
        this.props.tempSuccess()

        tracker.track('Profile change', {status: 'success'})
      })
      .catch((error) => {
        tracker.track('Profile change', {status: 'fail', error: error})

        throw {_error: error}
      })
  }

  dropzoneConfig = {
    showFiletypeIcon: false,
    postUrl: '/api/auth/profilepic',
    maxFiles: 1
  }

  dropzoneCoreConfig = {
    dictDefaultMessage: 'Drop an image or click to upload a picture'
  }

  dropzoneEventHandlers = {
    init: (dropzone) => {
      this.dropzone = dropzone
    },
    addedfile: () => {
      // TODO:UX upload progress photo placeholders
    },
    // TODO handle error
    success: (data, file) => {
      this.props.updatePic()
      tracker.track('Profile picture upload')
    },
    complete: (file) => {
      this.dropzone.removeFile(file)
    },
    maxfilesexceeded: (file) => {
      this.removeAllFiles()
      this.addFile(file)
    }
  }

  render() {
    const { fields: { email, name }, pristine, invalid,
      handleSubmit, submitting, success, error, submitFailed, user } = this.props

    if (!user) return null

    return (
      <div className="panel panel-default">
        <div className="panel-heading">
          <div className="panel-title">Edit Profile</div>
        </div>
        <div className="panel-body">
          {success &&
          <Alert bsStyle="success">
            Your profile has been successfully changed!
          </Alert>}

          {error && error.id &&
          <Alert bsStyle="danger">
            <strong>Woops! </strong>
            {(() => {
              switch (error.id) {
                case 'EmailTakenError': return 'Email is already taken'
                default: return 'Something went wrong'
              }
            })()}
          </Alert>}

          <div className="row">
            <div className="col-sm-3">
              <img src={user.profile_picture || require('../../components/HistoryItem/placeholder.png')} className={cx('profilePic')} />
            </div>
            <div className="col-sm-9">
              <DropzoneComponent
                config={this.dropzoneConfig}
                djsConfig={this.dropzoneCoreConfig}
                eventHandlers={this.dropzoneEventHandlers}
                className={cx('dropzone')}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(this.save)}>
            <Input object={email} label="Email" type="email" size="lg" focus />
            <Input object={name} label="Name" type="text" size="lg" />

            <button type="submit" className="btn btn-primary" disabled={pristine || (invalid && !submitFailed) || submitting}>
              {submitting ? ' Saving...' : ' Save'}
            </button>
          </form>
        </div>
      </div>
    )
  }
}
