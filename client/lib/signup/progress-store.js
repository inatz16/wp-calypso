/** @format */

/**
 * External dependencies
 */
import { cloneDeep, get, isEmpty, isEqual, omit } from 'lodash';
import debugFactory from 'debug';

/**
 * Internal dependencies
 */
import Dispatcher from 'dispatcher';
import steps from 'signup/config/steps';
import { SIGNUP_COMPLETE_RESET, SIGNUP_PROGRESS_SET } from 'state/action-types';
import {
	addOrUpdateStep,
	completeStep,
	processStep,
	submitStep,
} from 'state/signup/progress/actions';
import { getSignupProgress } from 'state/signup/progress/selectors';
import SignupDependencyStore from './dependency-store';

const debug = debugFactory( 'calypso:signup-progress-store' );

const SignupProgressStore = {
	subscribers: new Map(),
	currentValue: null,

	//
	// Redux actions
	//
	get() {
		return cloneDeep( getSignupProgress( this.reduxStore.getState() ) );
	},
	reset() {
		this.reduxStore.dispatch( {
			type: SIGNUP_COMPLETE_RESET,
		} );
		this.unsubscribeAll();
	},
	set( input ) {
		this.reduxStore.dispatch( {
			type: SIGNUP_PROGRESS_SET,
			steps: input,
		} );
	},
	setReduxStore( reduxStore ) {
		this.reduxStore = reduxStore;
	},

	//
	// Subscriptions and change handling
	//
	off( eventName, callback ) {
		eventName === 'change' && this.unsubscribe( callback );
	},
	on( eventName, callback ) {
		eventName === 'change' && this.subscribe( callback );
	},
	subscribe( callback ) {
		const unsubscribeFn = this.reduxStore.subscribe( () => {
			if ( ! isEqual( this.currentValue, this.get() ) ) {
				this.currentValue = SignupProgressStore.get();
				callback( this.currentValue );
			}
		} );
		this.subscribers.set( callback, unsubscribeFn );
	},
	unsubscribe( callback ) {
		if ( this.subscribers.has( callback ) ) {
			// NOTE: Executing the function stored at this key unsubscribes the listener
			this.subscribers.get( callback )();
			this.subscribers.delete( callback );
		}
	},
	unsubscribeAll() {
		[ ...this.subscribers.keys() ].forEach( key => this.unsubscribe( key ) );
	},
};

function addTimestamp( step ) {
	return { ...step, lastUpdated: Date.now() };
}

function addStorableDependencies( step, action ) {
	const unstorableDependencies = get( steps, [ step.stepName, 'unstorableDependencies' ] );

	if ( isEmpty( action.providedDependencies ) ) {
		return step;
	}

	const providedDependencies = omit( action.providedDependencies, unstorableDependencies );

	return { ...step, providedDependencies };
}

/**
 * Compatibility layer
 */
SignupProgressStore.dispatchToken = Dispatcher.register( function( payload ) {
	const { action } = payload;
	const step = addTimestamp( action.data );

	Dispatcher.waitFor( [ SignupDependencyStore.dispatchToken ] );

	if ( ! isEmpty( action.errors ) ) {
		SignupProgressStore.reduxStore.dispatch(
			addOrUpdateStep( { ...step, status: 'invalid', errors: action.errors } )
		);
		return;
	}

	debug( `Handling ${ action.type }` );
	switch ( action.type ) {
		case 'SAVE_SIGNUP_STEP':
			SignupProgressStore.reduxStore.dispatch(
				addOrUpdateStep( addStorableDependencies( step, action ) )
			);
			break;
		case 'SUBMIT_SIGNUP_STEP':
			SignupProgressStore.reduxStore.dispatch(
				submitStep( addStorableDependencies( step, action ) )
			);
			break;
		case 'PROCESS_SIGNUP_STEP':
			SignupProgressStore.reduxStore.dispatch(
				processStep( addStorableDependencies( step, action ) )
			);
			break;
		case 'PROCESSED_SIGNUP_STEP':
			SignupProgressStore.reduxStore.dispatch(
				completeStep( addStorableDependencies( step, action ) )
			);
			break;
	}
} );

export default SignupProgressStore;
