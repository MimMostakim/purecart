/**
 * CollapsibleSection component.
 *
 * Accordion wrapper for one Settings section - not worth a shared file
 * outside Settings/, nothing else in the app needs an accordion.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { Card } from '../ui/Card';

interface CollapsibleSectionProps {
	title: string;
	description?: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}

/**
 * Renders one collapsible settings section.
 *
 * @since 1.0.0
 *
 * @param {CollapsibleSectionProps} props Component props.
 *
 * @return {JSX.Element} The collapsible section.
 */
export function CollapsibleSection( { title, description, defaultOpen = false, children }: CollapsibleSectionProps ) {
	const [ open, setOpen ] = useState( defaultOpen );
	const Chevron = open ? ChevronDown : ChevronRight;

	return (
		<Card className="p-4">
			<button
				onClick={ () => setOpen( ( o ) => ! o ) }
				className="flex items-center gap-2 w-full text-left"
				style={ { background: 'none', border: 'none', cursor: 'pointer', padding: 0 } }
			>
				<Chevron size={ 16 } color={ M3.onSurfaceVariant } />
				<span className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
					{ title }
				</span>
			</button>
			{ open && (
				<div className="mt-3 pt-3 flex flex-col divide-y" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
					{ description && (
						<div className="text-xs pb-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
							{ description }
						</div>
					) }
					{ children }
				</div>
			) }
		</Card>
	);
}
