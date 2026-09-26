import type { Rating } from "@/app/types/occupation";

type StarRatingProps = {
  value: Rating;
  label?: string;
};

/**
 * Five-step editorial rating. The stars are decorative; assistive technology
 * receives the same value through the wrapper label.
 */
export function StarRating({ value, label = "評価" }: StarRatingProps) {
  return (
    <span
      className="star-rating"
      role="img"
      aria-label={`${label}：5段階中${value}（${value}/5）`}
    >
      <span className="star-rating__stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            className={index < value ? "star-rating__star star-rating__star--filled" : "star-rating__star"}
            key={index}
          >
            {index < value ? "★" : "☆"}
          </span>
        ))}
      </span>
      <span className="star-rating__value" aria-hidden="true">
        {value}/5
      </span>
    </span>
  );
}
