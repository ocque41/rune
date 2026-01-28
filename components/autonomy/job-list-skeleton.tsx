import { Skeleton } from "@/components/ui/skeleton";

export const JobListSkeleton = () => {
    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-6 rounded-md" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-3 border border-transparent space-y-2">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-3 rounded-full" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
