import * as React from "react"
import {cn} from "@/lib/utils"
import {ChevronRightIcon, CheckIcon} from "lucide-react"
import {ContextMenu as ContextMenuPrimitive} from "@base-ui/react/context-menu"

function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
    return (
        <ContextMenuPrimitive.Root
            data-slot="context-menu"
            {...props}
        />
    );
}

function ContextMenuPortal({ ...props }: ContextMenuPrimitive.Portal.Props) {
    return (
        <ContextMenuPrimitive.Portal
            data-slot="context-menu-portal"
            {...props}
        />
    )
}

function ContextMenuTrigger({
    className,
    ...props
}: ContextMenuPrimitive.Trigger.Props) {
    return (
        <ContextMenuPrimitive.Trigger
            data-slot="context-menu-trigger"
            className={cn("select-none", className)}
            {...props}
        />
    )
}


interface ContextMenuContentProps extends
    ContextMenuPrimitive.Popup.Props,
    Pick<ContextMenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> {
}


function ContextMenuContent({
    className,
    align = "start",
    alignOffset = 4,
    side = "right",
    sideOffset = 0,
    ...props
}: ContextMenuContentProps) {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                className="isolate z-50 outline-none"
            >
                <ContextMenuPrimitive.Popup
                    data-slot="context-menu-content"
                    className={cn("z-50 max-h-(--available-height) w-63 min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-[10px] border border-border bg-popover p-[7px] text-popover-foreground shadow-[0_12px_48px_#0009] ring-0 duration-0 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-none data-closed:animate-none", className)}
                    {...props}
                />
            </ContextMenuPrimitive.Positioner>
        </ContextMenuPrimitive.Portal>
    )
}

function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
    return (
        <ContextMenuPrimitive.Group
            data-slot="context-menu-group"
            {...props}
        />
    )
}

function ContextMenuLabel({
    className,
    inset,
    ...props
}: ContextMenuPrimitive.GroupLabel.Props & {
    inset?: boolean
}) {
    return (
        <ContextMenuPrimitive.GroupLabel
            data-inset={inset}
            data-slot="context-menu-label"
            className={cn(
                "max-w-70 truncate px-3 pt-2 pb-2.5 text-[11px] font-medium text-muted-foreground data-inset:pl-7",
                className
            )}
            {...props}
        />
    )
}


interface ContextMenuItemProps extends ContextMenuPrimitive.Item.Props {
    inset?: boolean;
    variant?: "default" | "destructive";
}


function ContextMenuItem({
    className,
    inset,
    variant = "default",
    ...props
}: ContextMenuItemProps) {
    return (
        <ContextMenuPrimitive.Item
            data-inset={inset}
            data-variant={variant}
            data-slot="context-menu-item"
            className={cn(
                "group/context-menu-item relative flex cursor-default items-center min-h-[38px] gap-3 rounded-md px-3 py-2.5 text-[13px] outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive",
                className
            )}
            {...props}
        />
    )
}

function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
    return (
        <ContextMenuPrimitive.SubmenuRoot
            data-slot="context-menu-sub"
            {...props}
        />
    )
}

function ContextMenuSubTrigger({
    className,
    inset,
    children,
    ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & {
    inset?: boolean
}) {
    return (
        <ContextMenuPrimitive.SubmenuTrigger
            data-inset={inset}
            data-slot="context-menu-sub-trigger"
            className={cn(
                "flex cursor-default items-center min-h-[38px] gap-3 rounded-md px-3 py-2.5 text-[13px] outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            {children}
            <ChevronRightIcon className="ml-auto"/>
        </ContextMenuPrimitive.SubmenuTrigger>
    )
}

function ContextMenuSubContent({
    ...props
}: React.ComponentProps<typeof ContextMenuContent>) {
    return (
        <ContextMenuContent
            side="right"
            className="shadow-lg"
            data-slot="context-menu-sub-content"
            {...props}
        />
    )
}

function ContextMenuCheckboxItem({
    className,
    children,
    checked,
    inset,
    ...props
}: ContextMenuPrimitive.CheckboxItem.Props & {
    inset?: boolean
}) {
    return (
        <ContextMenuPrimitive.CheckboxItem
            checked={checked}
            data-inset={inset}
            data-slot="context-menu-checkbox-item"
            className={cn(
                "relative flex cursor-default items-center min-h-[38px] gap-3 rounded-md py-2.5 pr-8 pl-3 text-[13px] outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <span className="pointer-events-none absolute right-2">
                <ContextMenuPrimitive.CheckboxItemIndicator>
                    <CheckIcon/>
                </ContextMenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.CheckboxItem>
    )
}

function ContextMenuRadioGroup({
    ...props
}: ContextMenuPrimitive.RadioGroup.Props) {
    return (
        <ContextMenuPrimitive.RadioGroup
            data-slot="context-menu-radio-group"
            {...props}
        />
    )
}

function ContextMenuRadioItem({
    className,
    children,
    inset,
    ...props
}: ContextMenuPrimitive.RadioItem.Props & {
    inset?: boolean
}) {
    return (
        <ContextMenuPrimitive.RadioItem
            data-inset={inset}
            data-slot="context-menu-radio-item"
            className={cn(
                "relative flex cursor-default items-center min-h-[38px] gap-3 rounded-md py-2.5 pr-8 pl-3 text-[13px] outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <span className="pointer-events-none absolute right-2">
                <ContextMenuPrimitive.RadioItemIndicator>
                    <CheckIcon/>
                </ContextMenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.RadioItem>
    )
}

function ContextMenuSeparator({
    className,
    ...props
}: ContextMenuPrimitive.Separator.Props) {
    return (
        <ContextMenuPrimitive.Separator
            data-slot="context-menu-separator"
            className={cn("-mx-1 my-1.5 h-px bg-border", className)}
            {...props}
        />
    )
}

function ContextMenuShortcut({
    className,
    ...props
}: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="context-menu-shortcut"
            className={cn(
                "ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground",
                className
            )}
            {...props}
        />
    )
}

export {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuCheckboxItem,
    ContextMenuRadioItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuGroup,
    ContextMenuPortal,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuRadioGroup,
}
