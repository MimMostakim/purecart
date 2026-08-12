/**
 * CancellationReasonList component.
 *
 * Renders the radio list of cancellation reasons shown in step 1 of the
 * Cancellation Flow modal. When the selected reason has hasTextBox: true, a
 * text area expands directly below that reason's row.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import type { CancellationReason } from '../../../utils/subscription-types';

/**
 * Renders a selectable list of cancellation reasons with an inline optional
 * text box under the selected reason, when that reason supports one.
 *
 * @since 1.0.0
 *
 * @param {Object}               props              Component props.
 * @param {CancellationReason[]} props.reasons       Reasons to list.
 * @param {string|null}          props.selectedId    Currently selected reason ID.
 * @param {Function}             props.onSelect      Callback invoked with the newly selected reason ID.
 * @param {string}               props.textValue     Controlled value for the expanding text box.
 * @param {Function}             props.onTextChange  Callback invoked with the new text box value.
 *
 * @return {JSX.Element} The cancellation reason list element.
 */
export function CancellationReasonList( {
	reasons,
	selectedId,
	onSelect,
	textValue,
	onTextChange,
}: {
	reasons: CancellationReason[];
	selectedId: string | null;
	onSelect: ( id: string ) => void;
	textValue: string;
	onTextChange: ( value: string ) => void;
} ) {
	return (
		<div className="flex flex-col gap-2">
			{ reasons.map( ( reason ) => {
				const selected = reason.id === selectedId;
				return (
					<div key={ reason.id }>
						<button
							onClick={ () => onSelect( reason.id ) }
							className="flex items-center gap-3 w-full p-3 rounded-2xl text-left transition-all"
							style={ {
								border: `2px solid ${
									selected ? M3.primary : M3.outlineVariant
								}`,
								backgroundColor: selected
									? M3.primaryContainer
									: M3.surfaceContainerLow,
								cursor: 'pointer',
							} }
						>
							<span
								className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
								style={ {
									border: `2px solid ${
										selected
											? M3.primary
											: M3.outlineVariant
									}`,
									backgroundColor: selected
										? M3.primary
										: 'transparent',
								} }
							>
								{ selected && (
									<span
										className="w-1.5 h-1.5 rounded-full"
										style={ { backgroundColor: M3.onPrimary } }
									/>
								) }
							</span>
							<span
								className="text-sm"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								{ reason.label }
							</span>
						</button>
						{ selected && reason.hasTextBox && (
							<textarea
								value={ textValue }
								onChange={ ( e ) => onTextChange( e.target.value ) }
								placeholder="Tell us more (optional)"
								rows={ 2 }
								className="w-full mt-2 rounded-xl outline-none"
								style={ {
									padding: '8px 12px',
									fontSize: 13,
									fontFamily: 'Roboto, sans-serif',
									color: M3.onSurface,
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.outlineVariant }`,
								} }
							/>
						) }
					</div>
				);
			} ) }
		</div>
	);
}
