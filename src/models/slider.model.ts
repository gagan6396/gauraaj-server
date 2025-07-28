import mongoose, { Document, Schema } from "mongoose";

interface IButton {
  label: string;
  actionURL: string;
}

interface ISlider extends Document {
  imageUrl: string;
  title: string;
  subtitle: string;
  button: IButton;
  sequence: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SliderSchema = new Schema<ISlider>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    button: {
      label: { type: String, required: true, trim: true },
      actionURL: { type: String, required: true, trim: true },
    },
    sequence: { type: Number, default: 0 }, // For ordering slides
    isHidden: { type: Boolean, default: false }, // Hide from public view
  },
  { timestamps: true }
);

const Slider = mongoose.model<ISlider>("Slider", SliderSchema);
export default Slider;