// GeoGuesser wrapper for extension compatibility
export function GeoGuesser() {
  return (
    <div className="flex h-full w-full flex-col bg-background">
      <iframe src="/sandbox.html" title="GeoGuesser Game" className="w-full flex-1 border-none" />
    </div>
  );
}
