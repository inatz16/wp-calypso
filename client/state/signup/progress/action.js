/** @format */

/**
 * Internal dependencies
 */
import steps from 'signup/config/steps';

export function addOrUpdateStep( step ) {
	return {
		type: 'SIGNUP_PROGRESS_ADD_OR_UPDATE',
		step,
	};
}

export function submitStep( step ) {
	const stepHasApiRequestFunction =
		steps[ step.stepName ] && steps[ step.stepName ].apiRequestFunction;
	const status = stepHasApiRequestFunction ? 'pending' : 'completed';

	return addOrUpdateStep( { ...step, status } );
}

export function processStep( step ) {
	return addOrUpdateStep( { ...step, status: 'processing' } );
}

export function completeStep( step ) {
	return addOrUpdateStep( { ...step, status: 'completed' } );
}
