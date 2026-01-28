import { Skeleton } from "@/components/ui/skeleton";

export const JobDetailsSkeleton = () => {
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border p-6 flex items-start justify-between bg-card/50">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-64" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-8">
                {/* Triage Skeleton */}
                <div className="border border-border rounded-lg p-4 space-y-2">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Plan Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32 mb-4" />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="pl-8 relative">
                            <Skeleton className="absolute left-0 top-1 h-6 w-6 rounded-full" />
                            <div className="border border-border rounded-md p-3 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
