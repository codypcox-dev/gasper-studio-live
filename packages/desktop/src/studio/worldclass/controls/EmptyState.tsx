export type EmptyStateProps = {
  title: string;
  body?: string;
  testId?: string;
};

export function EmptyState({ title, body, testId }: EmptyStateProps) {
  return (
    <div className="gwc-empty" data-testid={testId ?? "gwc-empty"}>
      <strong>{title}</strong>
      {body ? <span>{body}</span> : null}
    </div>
  );
}
