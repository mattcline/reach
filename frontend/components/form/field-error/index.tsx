export default function FieldError({ error }: { error?: any }) { // TODO: change 'any' to 'string'
  return error ? (
    <p role="alert" className="text-xs mt-1 text-red-500">
      {error}
    </p>
  ) : null;
}
