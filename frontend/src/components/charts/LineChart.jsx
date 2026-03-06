import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({
  data,
  title = 'Line Chart',
  height = 400,
  responsive = true,
  maintainAspectRatio = false,
  ...options
}) => {
  const defaultOptions = {
    responsive,
    maintainAspectRatio,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    ...options,
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Line data={data} options={defaultOptions} />
    </div>
  );
};

export default LineChart;